import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NodeService } from './Services/node.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Frontend';
  nodeData: any[] = [];
  loading: boolean = false;
  error: string | null = null;

  constructor(private nodeService: NodeService) { }

  ngOnInit(): void {
    this.GetNodes();
  }

  GetNodes(): void {
    this.loading = true;
    this.nodeService.getNodes().subscribe({
      next: (data) => {
        this.nodeData = data.message;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load node data';
        this.loading = false;
        console.error('Error fetching node data:', err);
      }
    });
  }
}
